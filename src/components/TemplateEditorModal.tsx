import { useState } from 'react';
import { DEFAULT_TEMPLATE, TEMPLATE_VARIABLES } from '../domain/prompt';
import { Modal } from './Modal';
import styles from './TemplateEditorModal.module.css';

interface TemplateEditorModalProps {
  /** 現在有効なテンプレート(カスタム or デフォルト) */
  current: string;
  isCustom: boolean;
  onSave: (template: string) => void;
  onReset: () => void;
  onClose: () => void;
}

export function TemplateEditorModal({
  current,
  isCustom,
  onSave,
  onReset,
  onClose,
}: TemplateEditorModalProps) {
  const [text, setText] = useState(current);

  return (
    <Modal title="プロンプトテンプレート編集" onClose={onClose}>
      <p className={styles.note}>
        {'{{変数名}}'} が生成時に置換されます。{isCustom ? '現在: カスタムテンプレート使用中' : '現在: デフォルトテンプレート使用中'}
      </p>
      <details className={styles.variables}>
        <summary>使える変数一覧</summary>
        <ul>
          {TEMPLATE_VARIABLES.map((variable) => (
            <li key={variable.name}>
              <code>{`{{${variable.name}}}`}</code> — {variable.description}
            </li>
          ))}
        </ul>
      </details>
      <textarea
        className={styles.editor}
        data-testid="template-editor"
        value={text}
        onChange={(event) => setText(event.target.value)}
        rows={18}
        aria-label="テンプレート本文"
      />
      <div className={styles.actions}>
        <button
          type="button"
          data-testid="template-reset"
          onClick={() => {
            setText(DEFAULT_TEMPLATE);
            onReset();
          }}
        >
          デフォルトに戻す
        </button>
        <button
          type="button"
          className={styles.save}
          data-testid="template-save"
          onClick={() => onSave(text)}
        >
          保存
        </button>
      </div>
    </Modal>
  );
}
